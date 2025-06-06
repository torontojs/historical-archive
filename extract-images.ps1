$EventsFolder = '.\src\data\events'
$ImagesFolder = "$EventsFolder\images"

if (-not (Test-Path $ImagesFolder)) {
	New-Item -Path $ImagesFolder -ItemType Directory | Out-Null
}

Get-ChildItem $EventsFolder -File |
ForEach-Object {
	$FilePath = $_
	$FileContents = Get-Content $FilePath | ConvertFrom-Json

	$ImageMatches = [regex]::Matches($FileContents.details, '\(http\S+?\.(?:jpg|jpeg|png|gif|webp)\)')

	$ImageMatches | ForEach-Object {
		$ImageUrl = [regex]::Replace($_.Value, '\(|\)', '')
		$ImageFile = Split-Path $ImageUrl -Leaf
		$ImagePath = "$ImagesFolder\$ImageFile"

		try {
			if (-not (Test-Path $ImagePath)) {
				Invoke-WebRequest -Uri $ImageUrl -UseBasicParsing -OutFile $ImagePath
			}

			$UnixFilePath = "./images/$ImageFile"
			$FileContents.details = $FileContents.details -replace @([regex]::Escape($ImageUrl), $UnixFilePath)
		} catch {
			Write-Error "Error downloading: $ImageUrl"
		}
	}

	$FileContents | ConvertTo-Json | Out-File $FilePath
}
