# Fetch latest signers' keys. We do this in order to check if a key was revoked.
while read fingerprint keyholder
do
  gpg --recv-keys ${fingerprint}
done < ./keys.txt
