require('../config');

const debug = require('debuggler')();
const Env = require('../config/env');
const octokit = require('@octokit/rest')();

/**
 * @param {String} owner Github owner username.
 * @param {String} repo Repository name.
 * @param {String[]} labels Issue labels.
 * @param {String} since Only issues updated at or after this time are returned.
 * This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ.
 * @param {String} [state='all'] Indicates the state of the issues to return.
 * Can be either open, closed, or all.
 * @return {Promise<Object[]>}
 */
const getAllIssues = async (owner, repo, labels = [], since, state = 'all') => {
  debug(`retrieving issues for: "${owner}:${repo}", with labels: "${labels.join(', ')}"`);
  const issues = [];

  let response = await octokit.issues.getForRepo({
    owner,
    repo,
    labels,
    state,
    since,
  });

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
    project: Env.GITHUB_PROJECT,
    labels: Env.ISSUE_LABELS,
    since: undefined,
    state: undefined,
  }, config);

  const {
    token,
    owner,
    project,
    labels,
    since,
  } = config;

  debug('starting changelog analysis');

  debug('initializing github api');

  octokit.authenticate({
    type: 'token',
    token,
  });

  const issues = await getAllIssues(owner, project, labels.split(','), since);

  return issues.map(getInfo);
};

module.exports = changelog;
