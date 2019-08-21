import { createRateLimitDirective } from 'graphql-rate-limit';
import { getClientIp } from 'request-ip';
import ms from 'ms';

export default createRateLimitDirective({
  identifyContext: ctx => (ctx.user && ctx.user.id) || getClientIp(ctx.request),
  formatError: ({ fieldName, max, window }) =>
    `You've called '${fieldName}' ${max} times in the past ${ms(window, { long: true })}!`,
});
