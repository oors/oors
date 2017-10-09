import Joi from 'joi';

class Product {
  static schema = {
    name: Joi.string().required(),
    price: Joi.number().required(),
    isPublic: Joi.boolean().default(false),
  };

  findAllPublic() {
    return this.findMany({
      query: {
        isPublic: true,
      },
    });
  }
}

export default Product;
