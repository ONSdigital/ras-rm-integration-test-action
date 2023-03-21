const core = require('@actions/core');
const github = require('@actions/github');
const {PubSub} = require('@google-cloud/pubsub');

function createMessage(feature, namespace, imageTag) {
  return {
    "parameters": {
      "service" : "case",
      "cluster": "dev",
      "namespace": namespace,
      "feature": feature,
      "tag": imageTag
    }
  }
}

async function publish(topicName, pubSubClient, data) {
   try {
        const messageId = await pubSubClient.topic(topicName).publish(data, {ci: "acceptance-tests"});
  } catch (error) {
  }
}

const topicName = core.getInput('spinnaker-topic')
const pubSubClient = new PubSub({projectId});
const imageTag = "pr-118";
const namespace = "babbal";
const surveyModes = ["@SEFT", "@EQ", "@BRES", "@EQANDSEFT"];
const messageAttributes = {
        ci: "acceptance-tests"
      }

surveyModes.forEach(feature => {
  const message = createMessage(feature, namespace, imageTag);
  const jsonMessageString = JSON.stringify(message);
  const dataBuffer = Buffer.from(jsonMessageString);
  publish(topicName, pubSubClient, dataBuffer);
});