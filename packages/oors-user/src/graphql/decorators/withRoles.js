import { withUser } from 'oors-graphql/build/decorators';
import intersection from 'lodash/intersection';
import { roles as availableRoles } from '../../constants/user';

export default roles => {
  roles.forEach(role => {
    if (!availableRoles.includes(role)) {
      throw new Error(`Unknown user role - "${role}"!`);
    }
  });

  return withUser({
    isValidUser: (_, args, { user }) => !!intersection(roles, user.roles).length,
  });
};
