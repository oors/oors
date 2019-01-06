import bcrypt from 'bcryptjs';
import pick from 'lodash/pick';

export const sanitizeUserData = user => ({
  ...pick(user, [
    '_id',
    'username',
    'email',
    'name',
    'accountId',
    'lastLogin',
    'roles',
    'isActive',
  ]),
});

export const hashPassword = (password, salt) =>
  new Promise((resolve, reject) => {
    bcrypt.hash(password, salt, (err, result) => {
      if (err) {
        return reject(err);
      }

      return resolve(result);
    });
  });
