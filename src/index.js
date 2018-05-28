require('../config');

const debug = require('debuggler')();
const Env = require('../config/env');
const octokit = require('@octokit/rest')();

/**
 * @param {String} owner Github owner username.
 * @param {String} repo Repository name.
 * @param {String} labels Comma separated labels.
 * @return {Promise<Object[]>}
 */
const getAllIssues = async (owner, repo, labels = []) => {
  debug(`retrieving issues for: "${owner}:${repo}", with labels: "${labels.join(', ')}"`);
  const issues = [];

  let response = await octokit.issues.getForRepo({
    owner,
    repo,
    labels,
    state: 'all',
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
    GITHUB_TOKEN: Env.GITHUB_TOKEN,
    GITHUB_OWNER: Env.GITHUB_OWNER,
    GITHUB_PROJECT: Env.GITHUB_PROJECT,
    ISSUE_LABELS: Env.ISSUE_LABELS,
  }, config);

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_PROJECT,
    ISSUE_LABELS,
  } = config;

  debug('starting changelog analysis');

  debug('initializing github api');

  octokit.authenticate({
    type: 'token',
    token: GITHUB_TOKEN,
  });

  const issues = await getAllIssues(GITHUB_OWNER, GITHUB_PROJECT, ISSUE_LABELS.split(','));

  return issues.map(getInfo);
};

module.exports = changelog;
