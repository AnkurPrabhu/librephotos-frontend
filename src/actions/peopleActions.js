import { showNotification } from "@mantine/notifications";

import { Server } from "../api_client/apiClient";
import i18n from "../i18n";
import { PersonDataPointList, PersonList } from "./peopleActions.types";

export function fetchPeople(dispatch) {
  dispatch({ type: "FETCH_PEOPLE" });
  Server.get("persons/?page_size=1000")
    .then(response => {
      const results = PersonList.parse(response.data.results);
      const mappedPeopleDropdownOptions = results.map(person => ({
        key: person.id,
        value: person.name,
        text: person.name,
        face_url: person.face_url,
        face_count: person.face_count,
        face_photo_url: person.face_photo_url,
      }));
      dispatch({
        type: "FETCH_PEOPLE_FULFILLED",
        payload: mappedPeopleDropdownOptions,
      });
    })
    .catch(payload => {
      dispatch({ type: "FETCH_PEOPLE_REJECTED", payload });
    });
}

export function renamePerson(personId, personName, newPersonName) {
  return function cb(dispatch) {
    dispatch({ type: "RENAME_PERSON" });
    Server.patch(`persons/${personId}/`, { newPersonName })
      .then(() => {
        // To-Do: I should do something with the response
        dispatch({ type: "RENAME_PERSON_FULFILLED", payload: personId });
        fetchPeople(dispatch);
        showNotification({
          message: i18n.t("toasts.renameperson", { personName, newPersonName }),
          title: i18n.t("toasts.renamepersontitle"),
          color: "teal",
        });
      })
      .catch(payload => {
        dispatch({ type: "RENAME_PERSON_REJECTED", payload });
      });
  };
}

export function deletePerson(person_id) {
  return function cb(dispatch) {
    dispatch({ type: "DELETE_PERSON" });
    Server.delete(`persons/${person_id}/`)
      .then(() => {
        // To-Do: I should do something with the response
        fetchPeople(dispatch);
        showNotification({
          message: i18n.t("toasts.deleteperson"),
          title: i18n.t("toasts.deletepersontitle"),
          color: "teal",
        });

        dispatch({ type: "DELETE_PERSON_FULFILLED" });
      })
      .catch(payload => {
        dispatch({ type: "DELETE_PERSON_REJECTED", payload });
      });
  };
}

export function setAlbumCoverForPerson(person_id, photo_hash) {
  return function cb(dispatch) {
    dispatch({ type: "SET_ALBUM_COVER_FOR_PERSON" });
    Server.patch(`persons/${person_id}/`, {
      cover_photo: photo_hash,
    })
      .then(() => {
        // To-Do: I should do something with the response
        dispatch({ type: "SET_ALBUM_COVER_FOR_PERSON_FULFILLED" });
        showNotification({
          message: i18n.t("toasts.setcoverphoto"),
          title: i18n.t("toasts.setcoverphototitle"),
          color: "teal",
        });

        fetchPeople(dispatch);
      })
      .catch(payload => {
        dispatch({ type: "SET_ALBUM_COVER_FOR_PERSON_REJECTED", payload });
      });
  };
}

export function fetchSocialGraph(dispatch) {
  dispatch({ type: "FETCH_SOCIAL_GRAPH" });
  Server.get("socialgraph")
    .then(response => {
      const payload = PersonDataPointList.parse(response.data);
      dispatch({
        type: "FETCH_SOCIAL_GRAPH_FULFILLED",
        payload,
      });
    })
    .catch(payload => {
      dispatch({ type: "FETCH_SOCIAL_GRAPH_REJECTED", payload });
    });
}
