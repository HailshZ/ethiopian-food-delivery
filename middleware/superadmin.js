// middleware/superadmin.js
module.exports = function isSuperAdmin(req, res, next) {
    if (req.session && req.session.role === 'superadmin') {
        next();
    } else {
        req.flash('error', 'Access denied. Super Admin only.');
        res.redirect('/');
    }
};
