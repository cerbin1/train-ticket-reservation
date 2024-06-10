const stations = [
  "Bełchatów",
  "Biała Podlaska",
  "Białystok",
  "Bielsko-Biała",
  "Bolesławiec",
  "Bydgoszcz",
  "Bytom",
  "Będzin",
  "Chełm",
  "Chorzów",
  "Ciechanów",
  "Częstochowa",
  "Dąbrowa Górnicza",
  "Elbląg",
  "Ełk",
  "Gdańsk",
  "Gdynia",
  "Gliwice",
  "Gniezno",
  "Gorzów Wielkopolski",
  "Grudziądz",
  "Głogów",
  "Inowrocław",
  "Jastrzębie-Zdrój",
  "Jaworzno",
  "Jelenia Góra",
  "Kalisz",
  "Katowice",
  "Kielce",
  "Knurów",
  "Konin",
  "Koszalin",
  "Kołobrzeg",
  "Kraków",
  "Krosno",
  "Kutno",
  "Kędzierzyn-Koźle",
  "Legionowo",
  "Legnica",
  "Leszno",
  "Lubin",
  "Lublin",
  "Łomża",
  "Łódź",
  "Mielec",
  "Mysłowice",
  "Nowa Sól",
  "Nowy Sącz",
  "Olsztyn",
  "Opole",
  "Ostrowiec Świętokrzyski",
  "Ostrołęka",
  "Ostrów Wielkopolski",
  "Otwock",
  "Oświęcim",
  "Pabianice",
  "Piekary Śląskie",
  "Piotrków Trybunalski",
  "Piła",
  "Poznań",
  "Pruszków",
  "Przemyśl",
  "Puławy",
  "Płock",
  "Racibórz",
  "Radom",
  "Radomsko",
  "Ruda Śląska",
  "Rybnik",
  "Rzeszów",
  "Siedlce",
  "Siemianowice Śląskie",
  "Sieradz",
  "Skarżysko-Kamienna",
  "Skierniewice",
  "Sopot",
  "Sosnowiec",
  "Stalowa Wola",
  "Starachowice",
  "Stargard",
  "Starogard Gdański",
  "Suwałki",
  "Szczecin",
  "Słupsk",
  "Świdnica",
  "Świnoujście",
  "Świętochłowice",
  "Tarnobrzeg",
  "Tarnów",
  "Tczew",
  "Tomaszów Mazowiecki",
  "Toruń",
  "Tychy",
  "Wałbrzych",
  "Warszawa",
  "Wejherowo",
  "Wodzisław Śląski",
  "Wrocław",
  "Włocławek",
  "Zabrze",
  "Zamość",
  "Zawiercie",
  "Zduńska Wola",
  "Zgierz",
  "Zielona Góra",
  "Żory",
  "Żyrardów",
];

const MIN_NUMBER_OF_HOURS = 3;
const MAX_NUMBER_OF_HOURS = 10;

window.onload = function () {
  let startStationInput = document.getElementById("start-station");
  let endStationInput = document.getElementById("end-station");

  const submitForm = document.getElementById("submit-form");
  submitForm.addEventListener("submit", function (event) {
    event.preventDefault();
    document.getElementById("search-form").style.display = "none";
    document.getElementById("results").style.display = "block";

    const startStationInputValue = startStationInput.value;
    const endStationInputValue = endStationInput.value;
    const datetimeInputValue = flatpickr("#datetime-picker", {})
      .selectedDates[0];
    const date =
      datetimeInputValue.getDate() +
      "-" +
      (datetimeInputValue.getMonth() < 9 ? "0" : "") +
      (datetimeInputValue.getMonth() + 1) +
      "-" +
      datetimeInputValue.getFullYear();
    const time = datetimeInputValue.toLocaleTimeString("pl-PL");

    const resultsDiv = document.getElementById("results");

    for (let i = 0; i < 5; i++) {
      const resultDiv = document.createElement("div");
      resultDiv.className = "result";

      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("result-details");

      const stationsNamesTitle = document.createElement("h2");
      stationsNamesTitle.textContent = `${startStationInputValue} -> ${endStationInputValue}`;
      detailsDiv.appendChild(stationsNamesTitle);

      const departureDate = document.createElement("p");
      departureDate.textContent = `Data: ${date}`;
      detailsDiv.appendChild(departureDate);

      const departureTime = document.createElement("p");
      departureTime.textContent = `Godzina odjazdu: 12:34`;
      detailsDiv.appendChild(departureTime);

      const arrivalTime = document.createElement("p");
      arrivalTime.textContent = `Godzina przyjazdu: 14:23`;
      detailsDiv.appendChild(arrivalTime);

      const duration = document.createElement("p");
      const randomDuration =
        Math.floor(
          Math.random() * (MAX_NUMBER_OF_HOURS - MIN_NUMBER_OF_HOURS)
        ) + MIN_NUMBER_OF_HOURS;
      duration.textContent = `Czas trwania: ${randomDuration} h`;
      detailsDiv.appendChild(duration);

      const detailsButton = document.createElement("a");
      detailsButton.textContent = "Szczegóły";
      detailsButton.classList.add("details-button");

      detailsButton.addEventListener("click", () => {
        alert(`TODO`);
      });

      resultDiv.appendChild(detailsDiv);
      resultDiv.appendChild(detailsButton);

      resultsDiv.appendChild(resultDiv);
    }
  });

  backToMenuButton.addEventListener("click", () => {
    document.getElementById("search-form").style.display = "block";
    document.getElementById("results").style.display = "none";
  });

  addAutocompleteTo(startStationInput);
  addAutocompleteTo(endStationInput);

  function closeSuggestionList() {
    const autocompleteLists =
      document.getElementsByClassName("autocomplete-items");
    for (let nextList of autocompleteLists) {
      nextList.parentNode.removeChild(nextList);
    }
  }

  document.addEventListener("click", function (e) {
    closeSuggestionList();
  });

  function addAutocompleteTo(input) {
    input.addEventListener("input", function () {
      closeSuggestionList();
      const userInput = this.value;
      if (!userInput) {
        return false;
      }
      const autocompleteContainer = document.createElement("div");
      autocompleteContainer.setAttribute("id", this.id + "autocomplete-list");
      autocompleteContainer.setAttribute("class", "autocomplete-items");
      this.parentNode.appendChild(autocompleteContainer);
      addAutocompleteSuggestionsToContainer(autocompleteContainer, userInput);
    });

    function addAutocompleteSuggestionsToContainer(container, userInput) {
      for (let i = 0; i < stations.length; i++) {
        const stationName = stations[i];
        if (nameStartsWithUserInput(stationName, userInput)) {
          const autocompleteSuggestion = document.createElement("div");
          autocompleteSuggestion.innerHTML += suggesionNameWithHiddenInputValue(
            userInput,
            stationName
          );
          autocompleteSuggestion.addEventListener("click", function (e) {
            input.value = this.getElementsByTagName("input")[0].value;
            closeSuggestionList();
          });
          container.appendChild(autocompleteSuggestion);
        }
      }
    }

    function suggesionNameWithHiddenInputValue(userInput, stationName) {
      return (
        "<strong>" +
        stationName.slice(0, userInput.length) +
        "</strong>" +
        stationName.slice(userInput.length) +
        "<input type='hidden' value='" +
        stationName +
        "'>"
      );
    }

    function nameStartsWithUserInput(stationName, value) {
      return stationName.toUpperCase().startsWith(value.toUpperCase());
    }
  }
};
