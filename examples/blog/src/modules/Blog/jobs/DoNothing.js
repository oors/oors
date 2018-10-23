/* eslint-disable class-methods-use-this */
import Job from '../../../../../../packages/oors-scheduler/build/libs/Job';

class DoNothing extends Job {
  config = {
    interval: '10 minutes',
  };

  run(module) {
    console.log(module.doNothingMessage);
  }
}

export default DoNothing;
