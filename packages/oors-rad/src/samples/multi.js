// const article = await Artile.findOne(someId);
// const article = await Article.multi([
//   ({ findOne }) => findOne(articleId),
//   (article, { loadCategories }) => loadCategories(article),
//   [
//     (article, { increseAmount }) => increaseAmount(article, 10),
//     (article, { bleah }) => bleah(article),
//   ]
// ]);
//
// article.categories = await Article.categories(article);
