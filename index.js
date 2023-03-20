const core = require('@actions/core');
const github = require('@actions/github');
const {PubSub} = require('@google-cloud/pubsub');

const NAMESPACE_POSITION = 1;
const PARAMS_POSITION = 2;
const CONFIG_BRANCH = "configBranch";
const DEPLOY = "/deploy"

const getInputs = () => {
  return {
    botToken: core.getInput('bot-token'),
    prNumber: `pr-${github.context.issue.number}`,
    spinnakerTopic: core.getInput('spinnaker-topic'),
    artifactBucket: core.getInput('artifact-bucket'),
    projectId: core.getInput('gcp-project'),
    commentBody: core.getInput("comment-body"),
    latestHelmChart: core.getInput("helm-chart")
  }
}

const run = async () => {
  try {
    const {botToken, prNumber, spinnakerTopic, 
      artifactBucket, projectId, commentBody, latestHelmChart} = getInputs()

    const namespace = commentBody.split(" ")[NAMESPACE_POSITION];
    let paramKey = "";
    let paramValue = "";
    let configBranch = "main";
    if (commentBody.split(" ").length > 2) {
      const params = commentBody.split(" ")[PARAMS_POSITION];
      if (params.startsWith(CONFIG_BRANCH)) {
        configBranch = params.split("=")[1];
      } else {
        paramKey = params.split("=")[0];
        paramValue = params.split("=")[1];
      }
    }


    const messageJson = {
      namespace,
      prNumber,
      paramKey,
      paramValue,
      actor: github.context.actor,
      configBranch,
      latestHelmChart
    }

    await publish(projectId, spinnakerTopic, artifactBucket, messageJson);

    const repo = github.context.repo.repo;
    const owner = github.context.repo.owner;

    const commentMessage = `Deploying to dev cluster with following parameters: \n- namespace: \`${namespace}\` 
      \n - tag: \`${prNumber}\` 
      \n - configBranch: \`${configBranch}\` 
      \n - paramKey: \`${paramKey}\` 
      \n - paramValue: \`${paramValue}\``;

    const octokit = github.getOctokit(botToken);

    core.info(`writing to ${owner}/${repo} for issue number ${github.context.issue.number}`);

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: github.context.issue.number,
      body: commentMessage,
    })

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function publish(projectId, topicName, artifactBucket, messageJson) {
  const pubSubClient = new PubSub({projectId});

  core.info(`helm path: ${messageJson.latestHelmChart}`);

  const spinnakerMessage = {
    parameters: {
      service : "case",
      cluster: "dev",
      namespace: "babbal",
      feature: "@SEFT",
      tag: "pr-118"
    }
 }
  const data = JSON.stringify(spinnakerMessage);

  const dataBuffer = Buffer.from(data);

  try {
    const messageId = await pubSubClient.topic(topicName)
      .publish(dataBuffer, {
        ci: "acceptance-tests"
      });
    core.info(`Message ${messageId} published.`);
  } catch (error) {
    core.error(`Received error while publishing: ${error.message}`);
    core.setFailed(error.message);
  }
}

run()

export default run