import { _mockApiResponse } from "./_mockApiResponse";
import { getOAuthService } from "./auth";
import { CC, ConnectorConfig, FieldType } from "./contants";
import { getFields } from "./fields";



/**
 * Возвращает табличные данные для запроса.
 * @param request
 * @global
 *
 * @see https://developers.google.com/datastudio/connector/reference?hl=ru#getdata
 */
export function getData(request: GoogleAppsScript.Data_Studio.Request<ConnectorConfig>) {
    const fields = getFields(request);
    const response = CC
        .newGetDataResponse()
        .setFields(fields);

    try {
        const rows = fetchData(request)
            .map((item: any) =>
                fields
                    .asArray()
                    .map(field => getFormattedCell(item, field)),
            );


        response
            .addAllRows(rows)
            .setFiltersApplied(false);

    } catch (e) {
        CC.newUserError()
            .setDebugText('Error fetching data from API: ' + e)
            .setText(
                'Failed to load data from Admitad. ' +
                'Perhaps the affiliate program ID is incorrect or you do not have permission to access the statistics. ' +
                'Please try again later or report the problem if the error persists.',
            )
            .throwException();
    }


    return response.build();
}



function getFormattedCell(item: any, field: GoogleAppsScript.Data_Studio.Field) {
    const key = field.getId();
    if (!key) {
        return;
    }

    let value = item[key];
    if (!value) {
        return value;
    }

    if (field.getType() === FieldType.YEAR_MONTH_DAY) {
        value = value.replace(/-/g, '');
    }

    return value;
}



function fetchData(request: GoogleAppsScript.Data_Studio.Request<ConnectorConfig>) {
    if (process.env.NODE_ENV !== 'production' && process.env.MOCK_ADMITAD_REQUESTS) {
        return _mockApiResponse(request);
    } else {
        return fetchDataFromApi(request);
    }
}



function fetchDataFromApi({configParams, dateRange}: GoogleAppsScript.Data_Studio.Request<ConnectorConfig>) {

    const service = getOAuthService();

    const headers = {
        Authorization: 'Bearer ' + service.getAccessToken(),
    };


    const baseUrl = 'https://api.admitad.com/advertiser/'
        + configParams.c_id
        + '/statistics/'
        + configParams.report_type
        + '/'; // Без слэша в конце сервер возвращает ошибку 404

    const query = [
        'limit=500',
        'start_date=' + dateRange.startDate,
        'end_date=' + dateRange.endDate,
    ].join('&');

    const responseString = UrlFetchApp.fetch(baseUrl + '?' + query, {headers}).getContentText();
    const response = JSON.parse(responseString);
    return response.results || [];
}



