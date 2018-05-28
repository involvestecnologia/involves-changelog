require('../config');

const debug = require('debuggler')();
const Env = require('../config/env');
const octokit = require('@octokit/rest')();

/**
 * @param {Object} config Config object.
 * @param {String} config.owner Github owner username.
 * @param {String} config.repo Repository name.
 * @param {String} config.labels Issue labels separated by comma.
 * @param {String} config.since Only issues updated at or after this time are returned.
 * This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.
 * @param {String} [config.state='all'] Indicates the state of the issues to return.
 * Can be either open, closed, or all.
 * @return {Promise<Object[]>}
 */
const getAllIssues = async (config) => {
  if (!config.since) delete config.since;
  if (config.labels) config.labels = config.labels.split(',');

  debug(`retrieving issues for: "${config.owner}:${config.project}", with labels: "${config.labels.join(', ')}"`);

  const issues = [];

  let response = await octokit.issues.getForRepo(config);

  issues.push(...response.data);

  while (octokit.hasNextPage(response)) {
    debug(`retrieving next page for: "${owner}:${repo}", with labels: "${labels.join(', ')}"`);

    response = await octokit.getNextPage(response);
    issues.push(...response.data);
  }

  return issues;
};

/**
 * @param {String} content Content text.
 * @param {String} tagName Tag name to look inside content.
 * @return {String[]}
 */
const getTagValue = (content, tagName) => {
  const tagRegex = new RegExp(`<${tagName}>([^]*?)</${tagName}>`, 'g');

  return (content.match(tagRegex) || [])
    .map(tag => tag
      .replace(`<${tagName}>`, '')
      .replace(`</${tagName}>`, '')
      .trim());
};

/**
 * Extract issue information from meta tags.
 *
 * @param {Object} issue Github issue object.
 * @return {{module: string, description: string, notes: Object[], cause: string}}
 */
const getInfo = (issue) => {
  debug(`extracting meta information for issue "${issue.id}"`);

  const module = (issue.title).startsWith('//')
    ? issue.title.replace('//', '').split('-')[0].trim()
    : 'UNDEFINED';

  const description = (getTagValue(issue.body, 'GC-DESCRICAO')
    .pop() || '');

  const notes = getTagValue(issue.body, 'GC-NOTA')
    .map(note => ({
      melhorias: getTagValue(note, 'MELHORIA'),
      inovacoes: getTagValue(note, 'INOVACAO'),
      duvidas: getTagValue(note, 'DUVIDA'),
      correcoes: getTagValue(note, 'CORRECAO'),
      dataRelease: getTagValue(note, 'DATA-RELEASE').pop(),
    }));

  const cause = (getTagValue(issue.body, 'GC-CAUSA')
    .pop() || '')
    .split('\n')
    .filter(cause => cause
      .startsWith('- [x] -'))
    .map(cause => cause
      .replace('- [x] -', '')
      .trim())
    .pop();

  return {
    module,
    description,
    notes,
    cause,
  };
};

/**
 * @param {Object} config Configuration object.
 * @return {Promise<Object>}
 */
const changelog = async (config) => {
  config = Object.assign({
    token: Env.GITHUB_TOKEN,
    owner: Env.GITHUB_OWNER,
    repo: Env.GITHUB_PROJECT,
    labels: Env.ISSUE_LABELS,
    since: undefined,
    state: 'all',
  }, config);

  debug('starting changelog analysis');

  debug('initializing github api');

  octokit.authenticate({
    type: 'token',
    token: config.token,
  });

  const issues = await getAllIssues(config);

  return issues.map(getInfo);
};

module.exports = changelog;
