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
