export default fields => node => {
  if ((Array.isArray(fields) ? fields : [fields]).includes(node.fieldName)) {
    Object.assign(node, {
      skip: true,
    });
  }
};
