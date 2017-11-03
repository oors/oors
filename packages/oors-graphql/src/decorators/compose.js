import flow from 'lodash/flow';

export default (...decorators) => flow(decorators.reverse());
