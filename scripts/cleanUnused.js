module.exports = function (file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.VariableDeclarator)
    .filter(
      (p) =>
        p.node.id.name &&
        !root
          .find(j.Identifier, { name: p.node.id.name })
          .filter((i) => i !== p)
          .size()
    )
    .remove();

  root
    .find(j.ImportDeclaration)
    .filter((p) => p.node.specifiers.length === 0)
    .remove();

  return root.toSource();
};
