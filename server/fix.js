const fs = require('fs'); 
let c = fs.readFileSync('antigravity.config.js', 'utf8'); 
c = c.replace(/You are a Strict Data Matcher.[\s\S]*?Return JSON format exactly like this:/, `You are a Smart Data Matcher. 
        1. Look at the 'service' identified by the Intent Agent.
        2. Look at the 'Available Providers' list provided in context.
        3. Semantically match the requested service with the provider's service. For example, 'Electrician' and 'AC Technician' might overlap if the user specifically asked for an AC Electrician.
        4. IF NO MATCH IS FOUND in the 'Available Providers' list, return status: 'waitlist'.
           - The message MUST be in the EXACT SAME language and script as the user requested (e.g., if language is 'Urdu', write the message in proper Urdu script: معذرت، اس وقت کوئی سروس فراہم کرنے والا دستیاب نہیں...).
           - If language is 'Roman Urdu', write in Roman Urdu.
        5. STRICT RULE: DO NOT invent names, clinics, or businesses. ONLY use data from the 'Available Providers' list.
        
        Current Task: Filter the provider list for the requested service and location. Select the best match based on rating and location.

        Return JSON format exactly like this:`); 
c = c.replace(/Polite Roman Urdu message if waitlist/, 'Polite message in the EXACT requested language/script if waitlist'); 
fs.writeFileSync('antigravity.config.js', c);
console.log("Done");
