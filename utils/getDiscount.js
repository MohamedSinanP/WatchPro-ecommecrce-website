function getDiscountedPrice(product, offers) {
  let discountedPrice = product.price;
  const productId = product._id?.toString();
  const categoryId = product.category?.toString();

  for (const offer of offers) {
    const offerProductIds = offer.products.map(id => id.toString());
    const offerCategoryIds = offer.categories.map(id => id.toString());

    const isProductMatch = offerProductIds.includes(productId);
    const isCategoryMatch = offerCategoryIds.includes(categoryId);


    if (isProductMatch || isCategoryMatch) {
      if (offer.discountType === 'percentage') {
        discountedPrice = Math.round(product.price * (1 - offer.discountValue / 100));
      } else if (offer.discountType === 'amount') {
        discountedPrice = Math.max(0, product.price - offer.discountValue);
      }
      break;
    }
  }

  return discountedPrice;
}
module.exports = getDiscountedPrice;