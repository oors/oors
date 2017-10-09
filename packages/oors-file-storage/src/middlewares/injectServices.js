import inject from 'oors/build/middlewares/inject';

export default inject('oors.fileStorage')(['FileRepository', 'File']);
