import {
  GET_CATALOGAPI_DATES_REQUEST,
  GET_CATALOGAPI_DATES_SUCCESS,
  GET_CATALOGAPI_DATES_FAILURE,
} from '../../actions/catalogapi';

const initialState = {
  byoc: {},
};

export function catalogapiReducer(state = initialState, action = {}) {
  switch (action.type) {
    case GET_CATALOGAPI_DATES_REQUEST:
      return {
        ...state,
        byoc: {
          ...state.byoc,
          [action.byoc]: { loading: true, error: null, data: null },
        },
      };
    case GET_CATALOGAPI_DATES_SUCCESS:
      return {
        ...state,
        byoc: {
          ...state.byoc,
          [action.byoc]: { loading: false, error: null, data: action.payload },
        },
      };
    case GET_CATALOGAPI_DATES_FAILURE:
      return {
        ...state,
        byoc: {
          ...state.byoc,
          [action.byoc]: { loading: false, error: action.error, data: null },
        },
      };
    default:
      return state;
  }
}
