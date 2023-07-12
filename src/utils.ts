export const downloadGit = (repository: string, destination: string) =>
  new Promise((resolve, reject) => {
    require('download-git-repo')(repository, destination, err => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};
