// middleware/owner.js – Restaurant owner middleware
module.exports = function isOwner(req, res, next) {
    if (req.session && req.session.role === 'owner') {
        return next();
    }
    req.flash('error', 'Access denied. Owner account required.');
    res.redirect('/');
};
