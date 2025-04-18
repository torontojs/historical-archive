Run this in the /events directory:

jq -n '[inputs | {title, startDate, "file":input_filename}]' * > ../directory.json
