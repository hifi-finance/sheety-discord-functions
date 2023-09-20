# Sheety Discord Functions

A Discord bot (webhook) to track Sheet Head activity on the Pooled NFT protocol and post updates to Discord.

## Set up and Deploy
1. Install firebase-tools
    ```bash
    $ npm install -g firebase-tools
    ```
1. Create a firebase project and upgrade to the Blaze (paid) plan.
1. Follow the "MAKING A WEBHOOK" instructions in the [Discord docs](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) to create a webhook for your Discord server.
1. Add the `DISCORD_WEBHOOK_URL` project secret and set it to your Webhook URL:
    ```bash
    firebase functions:secrets:set DISCORD_WEBHOOK_URL
    ```
1. Add the `OPENAI_API_KEY` project secret and set it to your OpenAI API key:
    ```bash
    firebase functions:secrets:set OPENAI_API_KEY
    ```
1. Add the `INFURA_PROJECT_ID` project secret and set it to your Infura project ID:
    ```bash
    firebase functions:secrets:set INFURA_PROJECT_ID
    ```
1. Add the `INFURA_PROJECT_SECRET` project secret and set it to your Infura project secret:
    ```bash
    firebase functions:secrets:set INFURA_PROJECT_SECRET
    ```
1. Create a Realtime Database in the Firebase console by following the [instructions](https://firebase.google.com/docs/database/web/start#create_a_database) and set the rules for the database to:
    ```json
    {
    "rules": {
        ".read": "auth != null",
        ".write": "auth != null"
        }
    }
    ```
1. Enable Secret Manager API by visiting the Secret Manager API page of your Firebase project and clicking "Enable". Where the URL can be found by replacing `<FIREBASE_PROJECT>` with your Firebase project ID in the following URL: `https://console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=<FIREBASE_PROJECT>`.

### Deploy
Deploy functions using the Firebase CLI:

```bash
$ firebase deploy
```

## License

This project is licensed under MIT.
