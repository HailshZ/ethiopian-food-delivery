// middleware/admin.js
module.exports = function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        req.flash('error', 'Access denied. Admin only.');
        res.redirect('/');
    }
};