import React from 'react';
import PropTypes from 'prop-types';
import Layout from './Layout';

const Hello = ({ user, account, rootURL }) =>
  (<Layout>
    <h1>Hello!</h1>
    <p>
      Your account with username {user.username} was created.
    </p>
    <p>
      Click{' '}
      <a href={`${rootURL}/account/${account._id.toString()}/confirm`}>
        here
      </a>{' '}
      to confirm your account.
    </p>
    <p>ktxbye!</p>
  </Layout>);

Hello.propTypes = {
  user: PropTypes.object.isRequired,
  account: PropTypes.object.isRequired,
  rootURL: PropTypes.string.isRequired,
};

export default Hello;
