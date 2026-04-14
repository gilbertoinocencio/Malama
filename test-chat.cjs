const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMDU3ODg2NywiZXhwIjoxOTI2MTU0ODY3fQ.Z6A33eWbL-xG47Q63I03Q1Jg75-Rk21sI964bS8ZkRE');
supabase.from('chat_messages').select('role, content').order('created_at', {ascending: false}).limit(10).then(res => console.log(JSON.stringify(res.data, null, 2)));
