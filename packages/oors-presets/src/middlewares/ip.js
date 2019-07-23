import requestIp from 'request-ip';

export default {
  id: 'ip',
  factory: requestIp.mw,
};
