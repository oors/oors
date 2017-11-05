import merge from 'lodash/merge';
import post from './post';
import comment from './comment';
import category from './category';

export default merge(post, comment, category);
