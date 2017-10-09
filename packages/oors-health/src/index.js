import { Module } from 'oors';
import router from './router';

class Health extends Module {
  name = 'oors.health';
  router = router;
}

export default Health;
