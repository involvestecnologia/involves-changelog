const path = require('path');

/**
* @see https://github.com/motdotla/dotenv#usage
*/
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: path.resolve(__filename, '../../.env.test') });
} if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__filename, '../../.env') });
}

/**
 * @class Env
 */
class Env {
  /**
   * Application context.
   *
   * @return {String}
   */
  static get NODE_ENV() {
    return process.env.NODE_ENV;
  }

  /**
   * Github access token.
   *
   * @see https://github.com/settings/tokens
   * @return {String}
   */
  static get GITHUB_TOKEN() {
    return process.env.GITHUB_TOKEN;
  }

  /**
   * Github owner name.
   *
   * @return {String}
   */
  static get GITHUB_OWNER() {
    return process.env.GITHUB_OWNER;
  }

  /**
   * Github project name.
   *
   * @return {String}
   */
  static get GITHUB_PROJECT() {
    return process.env.GITHUB_PROJECT;
  }

  /**
   * Issue labels separated by comma.
   * @return {String}
   */
  static get ISSUE_LABELS() {
    return process.env.ISSUE_LABELS;
  }
}

module.exports = Env;
