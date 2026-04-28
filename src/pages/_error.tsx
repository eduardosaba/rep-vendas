import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import type { NextPageContext } from 'next';

type Props = {
  statusCode?: number;
};

const CustomErrorComponent = (props: Props) => {
  return <Error statusCode={props.statusCode ?? 500} />;
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext): Promise<any> => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  try {
    // captureUnderscoreErrorException expects an object with error/context information
    // Sentry's typing may not be strict here so cast to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (Sentry as any).captureUnderscoreErrorException(contextData as any);
  } catch (e) {
    // swallow Sentry failures to avoid hiding the original error handling
    // eslint-disable-next-line no-console
    console.error('Sentry capture failed', e);
  }

  // This will contain the status code of the response
  return Error.getInitialProps(contextData as any);
};

export default CustomErrorComponent;
