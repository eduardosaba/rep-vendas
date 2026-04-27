import * as Sentry from "@sentry/nextjs";
import Error, { ErrorProps } from "next/error";
import type { NextPage, NextPageContext } from 'next';

const CustomErrorComponent: NextPage<Partial<ErrorProps>> = ({ statusCode }) => {
  return <Error statusCode={statusCode ?? 500} />;
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await Sentry.captureUnderscoreErrorException(contextData as any);

  // This will contain the status code of the response
  // Error.getInitialProps expects a context-like object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Error.getInitialProps(contextData as any);
};

export default CustomErrorComponent;
