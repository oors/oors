import { createRateLimitDirective } from 'graphql-rate-limit';
import { getClientIp } from 'request-ip';
import ms from 'ms';

export default createRateLimitDirective({
  identifyContext: ctx =>
    (ctx.user && (ctx.user.id || ctx.user._id).toString()) || getClientIp(ctx.req),
  formatError: ({ fieldName, max, window }) =>
    `Rate limit exceeded: you've called '${fieldName}' ${max} times in the past ${ms(window, {
      long: true,
    })}!`,
});
