const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token de autenticación requerido.' });

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_super_seguro', (err, usuario) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado.' });
    req.usuario = usuario; // Contiene id_usuario, id_comunidad, rol
    next();
  });
};

const soloAdministrador = (req, res, next) => {
  if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

module.exports = { verificarToken, soloAdministrador };