# Sheety Bot

A Discord bot (webhook) to track Sheet Head activity on the Pooled NFT protocol and post updates to Discord.

## Set up and Deploy
Install firebase-tools
```bash
$ npm install -g firebase-tools
```
Create a firebase project and upgrade to the Blaze (paid) plan.

### Discord Webhook URL

```bash
$ firebase functions:secrets:set DISCORD_WEB_HOOK
```
Enable the Secret Manager API by following the link provided as output from running the command above. Then run the command above again to set DISCORD_WEB_HOOK.

The sample uses [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) to send alerts to a Discord channel. You'll need to create a Webhook and hook it up the function by [creating an environment variable](https://firebase.google.com/docs/functions/config-env#env-variables):

1. Follow the "MAKING A WEBHOOK" instructions in the [Discord docs](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks). 
1. Copy the Webhook URL
1. Create a `.env` file in the `functions` directory
1. Add the `DISCORD_WEBHOOK_URL` variable and set it to your Webhook URL:
    ```bash
    DISCORD_WEBHOOK_URL="<your webhook url>"
    ```
1. Add the `OPENAI_API_KEY` variable and set it to your OpenAI API key:
    ```bash
    OPENAI_API_KEY="<your openai api key>"
    ```
1. Add the `INFURA_PROJECT_ID` and `INFURA_PROJECT_SECRET` variables and set them to your Infura project ID and secret:
    ```bash
    INFURA_PROJECT_ID="<your infura project id>"
    INFURA_PROJECT_SECRET="<your infura project secret>"
    ```
1. Create the Google Cloud project secrets by running the following commands one at a time:
    ```bash
    firebase functions:secrets:set DISCORD_WEBHOOK_URL
    firebase functions:secrets:set OPENAI_API_KEY
    firebase functions:secrets:set INFURA_PROJECT_ID
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
1. Enable Secret Manager API by visiting the [Secret Manager API page](https://console.developers.google.com/apis/api/secretmanager.googleapis.com/overview?project=<FIREBASE_PROJECT>) and clicking "Enable".

### Deploy
Deploy functions using the Firebase CLI:

```bash
$ firebase deploy
```

## Sensible Defaults

This template comes with sensible default configurations in the following files:

```text
├── .editorconfig
├── .eslintignore
├── .eslintrc.yml
├── .gitignore
├── .prettierignore
├── .prettierrc.yml
├── package.json
├── tsconfig.json
└── tsconfig.prod.json
```

## License

This project is licensed under MIT.