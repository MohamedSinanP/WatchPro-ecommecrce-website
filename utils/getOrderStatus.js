function determineOrderStatus(products) {
  if (!products || products.length === 0) {
    return 'Pending';
  }

  const statuses = products.map(product => product.status);
  const uniqueStatuses = [...new Set(statuses)];

  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'Cancelled') {
    return 'Cancelled';
  }

  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'Returned') {
    return 'Returned';
  }

  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'Delivered') {
    return 'Delivered';
  }

  if (statuses.includes('Delivered')) {
    return 'Delivered';
  }

  if (statuses.includes('Shipped')) {
    return 'Shipped';
  }

  if (statuses.includes('Confirmed')) {
    return 'Confirmed';
  }

  if (statuses.some(s => ['Cancelled', 'Returned'].includes(s)) &&
    statuses.some(s => ['Pending', 'Ordered'].includes(s))) {
    return 'Pending';
  }

  return 'Pending';
}

module.exports = determineOrderStatus