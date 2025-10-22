exports.register = function() {
    const plugin = this;
    
    plugin.register_hook('rcpt', 'accept_tempiemail');
    
    plugin.accept_tempiemail = function(next, connection, params) {
        const rcpt = params[0];
        const address = rcpt.address();
        
        plugin.loginfo(`Checking recipient: ${address}`);
        
        // Accept emails for tempiemail.com domain
        if (address.endsWith('@tempiemail.com')) {
            plugin.loginfo(`Accepting email for ${address}`);
            return next(OK);
        }
        
        plugin.loginfo(`Rejecting email for ${address}`);
        return next(DENY, 'I cannot deliver mail for <' + address + '>');
    };
};
