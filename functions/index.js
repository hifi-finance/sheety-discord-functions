const functions = require("firebase-functions")
const logger = require("firebase-functions/logger")
const { Contract, InfuraProvider } = require("ethers")
const axios = require("axios")
const erc721Abi = require("./abis/ERC721.json")

const admin = require("firebase-admin")
admin.initializeApp()
const db = admin.database()

const sheet_heads_pool_address = "0xc2bc2320D22D47D1e197E99D4a5dD3261ccf4A68"
const sheet_heads_contract_address =
  "0xAA14657d3a563c679DFD807150EdCcE0833b29Ba"

const { defineSecret } = require("firebase-functions/params")
const infuraProjectId = defineSecret("INFURA_PROJECT_ID")
const infuraKey = defineSecret("INFURA_PROJECT_SECRET")
const openaiApiKey = defineSecret("OPENAI_API_KEY")
const discordWebhookUrl = defineSecret(
  "DISCORD_WEBHOOK_URL"
)

// Monitors Sheet Head NFT activity
exports.alchemyWebHookNFTActivity = functions.https.onRequest(
  async (request, response) => {
    logger.info(request.body)
    await db.ref(`/queue/SheetHeadNFTActivity/`).push(request.body)
    response.status(200).send()
  }
)

exports.processSheetHeadNFTActivityQueue = functions.database
  .ref("/queue/SheetHeadNFTActivity/{uid}")
  .onCreate(async (snapshot, context) => {
    const data = snapshot.val()

    // check if data.activity is an array
    let activityArray = []
    if (!Array.isArray(data.event.activity)) {
      activityArray.push(data.event.activity)
    } else {
      activityArray = data.event.activity
    }

    for (const activity of activityArray) {
      if (
        activity.toAddress.toLowerCase() !==
          sheet_heads_pool_address.toLowerCase() &&
        activity.fromAddress.toLowerCase() !==
          sheet_heads_pool_address.toLowerCase()
      ) {
        continue
      }
      if (data.onlyDev) {
        activity.onlyDev = true
      }
      // Each activity gets its own message
      await db.ref(`/queue/SheetHeadNFTActivityMessages/`).push(activity)
    }

    return snapshot.ref.remove()
  })

let provider = null
let nftContract = null

exports.processSheetHeadNFTActivityMessagesQueue = functions
  .runWith({
    secrets: [infuraProjectId.name, infuraKey.name, openaiApiKey.name]
  })
  .database.ref("/queue/SheetHeadNFTActivityMessages/{uid}")
  .onCreate(async (snapshot, context) => {
    const activity = snapshot.val()
    logger.log(activity)
    // lazy load provider and contract in case functions instance was reused
    if (!provider) {
      provider = new InfuraProvider(
        "homestead",
        infuraProjectId.value(),
        infuraKey.value()
      )
    }
    if (!nftContract) {
      nftContract = new Contract(
        sheet_heads_contract_address,
        erc721Abi,
        provider
      )
    }

    const txType =
      activity.toAddress.toLowerCase() ===
      sheet_heads_pool_address.toLowerCase()
        ? "Deposit"
        : "Withdraw"
    const tokenId = parseInt(activity.erc721TokenId, 16).toString()

    const tokenURI = await nftContract.tokenURI(tokenId)
    const { data: metadata } = await axios.get(tokenURI)
    const url = `https://etherscan.io/tx/${activity.hash}`
    const image_url = metadata.image || url
    const txContext =
      txType === "Deposit"
        ? `being deposited into the pool.`
        : `being withdrawn from the pool.`
    let trials_remaining = 3
    let descriptionJSON = null
    while (trials_remaining > 0 && !descriptionJSON) {
      try {
        const description = await promptOpenAi(
          openaiApiKey.value(),
          metadata,
          txContext
        )
        descriptionJSON = JSON.parse(description)
      } catch (error) {
        logger.error(error)
        trials_remaining -= 1
      }
    }

    const field1 = { name: "ID", value: tokenId, inline: true }
    const field2 = { name: "Action", value: txType, inline: true }
    const message = {
      title: descriptionJSON.title,
      description: descriptionJSON.comment,
      image_url,
      url,
      fields: [field2, field1],
      color: 4183118,
      has_thumbnail: true
    }
    await db.ref(`/queue/send-discord-message/`).push(message)

    return snapshot.ref.remove()
  })

const thumbnail_url =
  "https://storage.googleapis.com/public-sheetheads/assets/pooled_nft_logo_discord_bot_centered.png"
const color = 4183118

exports.checkForFailedTriggers = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async (context) => {
    await replayFailedTriggerEventsAtPath("/queue/SheetHeadNFTActivityMessages")
    await replayFailedTriggerEventsAtPath(
      "/queue/send-discord-message"
    )
  })

exports.processSendDiscordMessageQueue = functions
  .runWith({ secrets: [discordWebhookUrl.name] })
  .database.ref("/queue/send-discord-message/{uid}")
  .onCreate(async (snapshot, context) => {
    const timestamp = new Date().toISOString()
    try {
      const data = snapshot.val()

      logger.log(data)
      await axios({
        method: "POST",
        url: discordWebhookUrl.value(),
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        data: {
          embeds: [
            {
              thumbnail: data.has_thumbnail
                ? {
                    url: data.thumbnail_url || thumbnail_url
                  }
                : null,
              color,
              title: data.title,
              image: {
                url: data.image_url
              },
              description: data.description,
              timestamp,
              url: data.url,
              fields: data.fields
            }
          ]
        }
      })
      return snapshot.ref.remove()
    } catch (error) {
      // combine two objects
      logger.error(error)
      return snapshot.ref.child("errorTimestamp").set(timestamp)
    }
  })

async function replayFailedTriggerEventsAtPath(path) {
  if (path.charAt(path.length - 1) === "/") {
    path = path.slice(0, -1)
  }
  const data = await (await db.ref(`${path}`).once("value")).val()
  logger.log(path, data)
  if (!data) {
    // skip if there's no data
    return
  }
  const keys = Object.keys(data)
  const values = Object.values(data)
  values.forEach(async (item, index) => {
    await admin.database().ref(`${path}/${keys[index]}`).remove()
    item.retryNumber = item.retryNumber ? item.retryNumber + 1 : 1
    if (item.retryNumber > 10) {
      // 10 retries
      return
    }
    await db.ref(`${path}`).push(item)
  })
}

async function promptOpenAi(apikey, metadata, txContext) {
  const content = `Given the metadata for an NFT delimited by triple-double-quotes ("""), and the context of an event delimited by double-single-quotes ('') write a title and funny one-line comment about the nft, feel free to makeup a name for the NFT. The response should be a valid JSON object with keys 'title' and 'comment'.
          METADATA:
          """
          ${JSON.stringify(metadata)}
          """
          CONTEXT:
          ''
          ${txContext}
          ''
    `

  const response = await axios({
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${apikey}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    data: {
      model: "gpt-4",
      messages: [
        {
          content,
          role: "user"
        }
      ]
    }
  })
  logger.log(response.data)
  return response.data.choices[0].message.content
}
