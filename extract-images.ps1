Get-ChildItem '.\src\data\events' -File |
ForEach-Object {
	$FilePath = $_
	$FileContents = Get-Content $FilePath | ConvertFrom-Json

	# TODO: get all matches
	$FileContents.details -match 'http\S+?\.(?:jpg|jpeg|png|gif|webp)' | Out-Null

	if ($Matches[0]) {
		$ImageUrl = $Matches[0]
		$ImageFile = Split-Path $ImageUrl -Leaf

		try {
			Invoke-WebRequest -Uri $ImageUrl -UseBasicParsing -OutFile ".\src\data\events\$ImageFile"

			# TODO: replace urls with paths
			$FileContents | ConvertTo-Json | Out-File $FilePath
		} catch {
			Write-Error "Error downloading: $ImageUrl"
		}
	}
}
