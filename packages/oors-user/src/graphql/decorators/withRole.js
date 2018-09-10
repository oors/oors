import { withUser } from 'oors-graphql/build/decorators';
import { roles as availableRoles } from '../../constants/user';

export default role => {
  if (!availableRoles.includes(role)) {
    throw new Error(`Unknown user role - "${role}"!`);
  }

  return withUser({
    isValidUser: (_, args, { user }) => Array.isArray(user.roles) && user.roles.includes(role),
  });
};
