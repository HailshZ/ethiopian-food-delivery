// middleware/auth.js – Authentication & authorization middleware

function isLoggedIn(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.isAdmin) {
        return next();
    }
    req.flash('error', 'Admin access required');
    return res.redirect('/login');
}

module.exports = { isLoggedIn, isAdmin };
