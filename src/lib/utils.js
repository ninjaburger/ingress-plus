export const formatNumber = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
export const isNumber = (value) =>
    (typeof value === 'number' && value - value === 0) ||
    (typeof value === 'string' && Number.isFinite(+value) && value.trim() !== '');