
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yaprpcisvtsbtmivqisp.supabase.co';
const supabaseKey = 'sb_publishable_tpN7rgzweXmClNIFF_HN_w__8e51Wbp';

export const supabase = createClient(supabaseUrl, supabaseKey);
