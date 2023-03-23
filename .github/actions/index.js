const {setFailed, getInput} = require('@actions/core');
const {context, getOctokit} = require('@actions/github');
const {PubSub} = require('@google-cloud/pubsub');

const publishMessage = async (topicName, pubSubClient, data) => {
    try {
        await pubSubClient.topic(topicName).publishMessage({
            "data": data,
            "attributes": {
                "ci": "acceptance-tests"
            }
        });
    } catch (error) {
        setFailed(error.message);
    }
}

const createGithubComment = async (surveyModesToTest, prNumber) => {
    const repo = context.repo.repo;
    const owner = context.repo.owner;
    const body ="Integration test queued for " + surveyModesToTest.toString();
    const githubToken= getInput('bot-token');
    const octokit = getOctokit(githubToken);
    try {
        await octokit.rest.issues.createComment({owner, repo, issue_number:prNumber, body});
    } catch (error) {
        setFailed(error.message);;
    }
}

const main = async () => {
    commentBody = getInput("comment-body")
    let surveyModesToTest = ["SEFT", "EQ", "BRES", "EQANDSEFT"];
    try {
        const namespace = commentBody.split(" ")[1];
        if (commentBody.split(" ").length = 2) {
            surveyModesToTest = [commentBody.split(" ")[2]];
        }
    } catch (error) {
        setFailed(error.message);
    }

    const projectId = getInput("gcp-project");
    const topicName = getInput("spinnaker-topic");
    const prNumber = getInput("pr-number");
    const pubSubClient = new PubSub({projectId});

    for await (let surveyMode of surveyModesToTest) {
        const jsonMessageString = JSON.stringify({
            "parameters": {
                "service": "acceptance-tests",
                "cluster": "dev",
                "namespace": "babbal",
                "feature": "@" + surveyMode,
                "tag": "pr-" + prNumber
            }
        });
        const dataBuffer = Buffer.from(jsonMessageString);
        await publishMessage(topicName, pubSubClient, dataBuffer);
    }
    createGithubComment(surveyModesToTest, prNumber);
}

main();

