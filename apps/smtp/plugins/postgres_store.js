const { Pool } = require('pg');

exports.register = function() {
    const plugin = this;
    
    // Database connection
    const pool = new Pool({
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'tempiemail',
        password: process.env.DB_PASSWORD || 'tempiemail',
        database: process.env.DB_DATABASE || 'tempiemail'
    });

    plugin.loginfo('Postgres store plugin loaded');

    plugin.register_hook('data_post', 'store_email');
    
    plugin.store_email = function(next, connection) {
        const transaction = connection.transaction;
        const to = transaction.rcpt_to[0].address();
        const from = transaction.mail_from.address();
        
        plugin.loginfo(`Storing email from ${from} to ${to}`);
        
        // Extract local part from email
        const localPart = to.split('@')[0];
        
        // Find the address_id for this email
        pool.query(
            'SELECT id FROM addresses WHERE local_part = $1 AND domain = $2',
            [localPart, 'tempiemail.com']
        ).then(result => {
            if (result.rows.length === 0) {
                plugin.logwarn(`No address found for ${to}`);
                return next();
            }
            
            const addressId = result.rows[0].id;
            
            // Parse email content
            const emailData = transaction.message_stream;
            let emailContent = '';
            let subject = '';
            let textBody = '';
            let htmlBody = '';
            
            // Simple email parsing (in production, use a proper email parser)
            const lines = emailData.toString().split('\n');
            let inHeaders = true;
            let inBody = false;
            let bodyLines = [];
            
            for (let line of lines) {
                if (inHeaders) {
                    if (line.toLowerCase().startsWith('subject:')) {
                        subject = line.substring(8).trim();
                    }
                    if (line.trim() === '') {
                        inHeaders = false;
                        inBody = true;
                        continue;
                    }
                }
                if (inBody) {
                    bodyLines.push(line);
                }
            }
            
            textBody = bodyLines.join('\n');
            
            // Store the email
            return pool.query(
                `INSERT INTO messages (address_id, from_addr, to_addr, subject, text_body, html_body, raw, received_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [addressId, from, to, subject, textBody, htmlBody, emailData, new Date()]
            );
        }).then(() => {
            plugin.loginfo(`Email stored successfully for ${to}`);
            next();
        }).catch(error => {
            plugin.logerror(`Error storing email: ${error.message}`);
            next();
        });
    };
};
