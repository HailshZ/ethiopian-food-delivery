// middleware/owner.js – Provider (restaurant owner) middleware
module.exports = function isOwner(req, res, next) {
    if (req.session && req.session.role === 'provider') {
        return next();
    }
    req.flash('error', 'Access denied. Provider account required.');
    res.redirect('/');
};
