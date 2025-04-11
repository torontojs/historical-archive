Run this in the /events directory:

jq -s 'map({title, startDate, "file":input_filename})' * > ../directory.json
