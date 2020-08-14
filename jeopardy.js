class Jeopardy {
	constructor() {
		// categories: an array of objects, each containing a title & array of 5 clue objects, each containing an a question, answer, and showing
		this.categories = [];
		// the td that contains the clue that is currently displayed
		this.clickedClue = null;
		// the clue that is currently being used
		this.clue = null;
		// number of categories
		this.NUM_CATEGORIES = 6;
		// number of clues per category
		this.NUM_CLUES_PER_CAT = 5;
		// the background that shows up after the game has loaded
		this.gameBackground =
			"https://images.squarespace-cdn.com/content/v1/5bc58608348cd9430c0c030d/1545076815317-ZKSB19U6SBJCUC26ZMZ3/ke17ZwdGBToddI8pDm48kNvT88LknE-K9M4pGNO0Iqd7gQa3H78H3Y0txjaiv_0fDoOvxcdMmMKkDsyUqMSsMWxHk725yiiHCCLfrh8O1z5QPOohDIaIeljMHgDF5CVlOqpeNLcJ80NK65_fV7S1UbeDbaZv1s3QfpIA4TYnL5Qao8BosUKjCVjCf8TKewJIH3bqxw7fF48mhrq5Ulr0Hg/New+Background.png";
	}
	// Returns array of category ids
	async getCategoryIds() {
		const responseOfCats = await axios.get(
			"http://jservice.io/api/categories",
			{
				params: { count: 100 },
			}  
		);
		const idArray = responseOfCats.data.map((cat) => cat.id);
		return _.sampleSize(idArray, game.NUM_CATEGORIES);
	}
	// Returns object with data about a category: e.g - { title: "Math", clues: clue-array }
	async getCategory(categoryId) {
		const category = await axios.get("http://jservice.io/api/category", {
			params: { id: categoryId },
		});
		let clueArray = category.data.clues.map((clue) => {
			return {
				question: clue.question,
				answer: clue.answer,
				showing: null,
			};
		});
		return { title: category.data.title, clueArray };
	}
	// removes any current table, makes a new thead & fills with categories, then makes new tbody & fills with clues
	fillTable(ids, cats) {
		game.emptyTable();
		game.makeTableHead(cats);
		game.makeTableBody(ids);
	}
	// creates a new thead and fills each td within it with each category title
	makeTableHead(cats) {
		$("thead").append(`<tr id="head-row"></tr>`);
		cats.map((cat) => {
			$("#head-row").append(`<td>${cat.title}</td>`);
		});
	}
	// creates a new tbody, gives it 5 rows, and fills each row with a td for each category
	makeTableBody(ids) {
		for (let i = 0; i < game.NUM_CLUES_PER_CAT; i++) {
			$("tbody").append(`<tr class="body-row-${i}"></tr>`);
			let col = 0;
			ids.map((id) => {
				$(`.body-row-${i}`).append(
					`<td class="clue ${i} ${col + game.NUM_CATEGORIES} unanswered">?</td>`
				);
				col++;
			});
		}
	}
	// empties the table of its contents
	emptyTable() {
		$("thead").empty();
		$("tbody").empty();
	}
	// handles the event of the user clicking on a clue and therefore changes the "showing" property of that clue
	handleClick(evt) {
		let classList = Array.from(evt.target.classList);
		let clueNumber = classList[1];
		let clueColumn = classList[2] - game.NUM_CATEGORIES;
		if (!$(".big-question").length) {
			game.clue = game.categories[clueColumn].clueArray[clueNumber];
		}
		game.changeShowing(evt, game.clue);
	}
	//changes the "showing" property of the clue based on what the DOM currently shows & if the user is clicking on a td or on a ".big-question"
	changeShowing(event, clue) {
		if (clue.showing === null) {
			game.clickedClue = event.target;
			game.clickedClue.innerText = "";
			game.showQuestion(clue);
		} else if (clue.showing === "question") {
			$(`.big-question`).html(`<h3>${clue.answer}</h3>`);
			clue.showing = "answer";
		} else if (clue.showing === "answer") {
			game.removePopup();
		}
	}
	// removes the ".big-question" from the DOM
	removePopup() {
		setTimeout(function () {
			$(".transparent-background").removeClass("visible").addClass("invisible");
			$(".big-question").removeClass("visible").addClass("invisible");
			setTimeout(function () {
				game.clickedClue.classList.remove("unanswered");
				game.clickedClue.classList.add("answered");
				$(".transparent-background").remove();
			}, 300);
		}, 200);
	}
	// adds an event listener to the ".big-question" so that the answer can be shown & so that it can be taken away
	addListenerToPopup() {
		$(".big-question")
			.get()[0]
			.addEventListener("click", function (e) {
				game.handleClick(e);
			});
	}
	// makes the ".big-question" appear on top of the game board
	showQuestion(clue) {
		game.appendQuestion(clue);
		setTimeout(function () {
			$(".transparent-background").removeClass("invisible").addClass("visible");
			$(".big-question").removeClass("invisible").addClass("visible");
			game.addListenerToPopup();
			clue.showing = "question";
		}, 300);
	}
	// creates the HTML for the '.big-question', which is appended to the '#pseudo-body'
	appendQuestion(clue) {
		$("#pseudo-body").append(`
        <div class="transparent-background invisible">
            <div class="big-question invisible">
                <h2>${clue.question}</h2>
            </div>
        </div>`);
	}

	// darkens the background & shows a spinning loading wheel as the HTTP request waits for a response
	showLoadingView() {
		$(".btn").css("display", "none");
		$("table").remove();
		$("body").prepend(`
        <div class="transparent-background">
            <div class="loader"></div>
        </div>`);
	}
	// shows the game board once the HTTP request has received a response
	hideLoadingView() {
		$(".transparent-background").remove();
		$("#btn").css("display", "block");
	}
	// occurs when user clicks "START"/"RESTART" - starts a new game
	async setupAndStart() {
		const idArr = await game.getCategoryIds();
		await game.setup(idArr);
		game.start(idArr);
		const restartBtn = $(".btn").get()[0];
		restartBtn.addEventListener("click", game.restartGame);
		$("body").css("background-image", `url(${game.gameBackground})`);
	}
	async setup(idArr) {
		game.showLoadingView();
		await game.fillCategories(idArr);
	}
	start(idArr) {
		game.hideLoadingView();
		game.createTable(idArr, game.categories);
		game.addListenerToClues();
	}

	// adds an event listener to each td to listen for a click and perform handleClick() when one occurs
	addListenerToClues() {
		const clueArr = Array.from($(".clue"));
		clueArr.map((clue) => {
			clue.addEventListener("click", (e) => game.handleClick(e));
		});
	}
	// fills the category array with categories that correspond to each 'id' from the argument 'idArr'
	async fillCategories(idArr) {
		for (let id of idArr) {
			let category = await game.getCategory(id);
			game.categories.push(category);
		}
	}
	// creates a new table and fills the table with categories & clues
	createTable(ids, cats) {
		$(".btn").remove();
		game.appendTable();
		game.changeButton();
		game.fillTable(ids, cats);
	}
	// appends the HTML for the new table to '#pseudo-body'
	appendTable() {
		$("#pseudo-body").append(`
        <div id="main-div">
            <table id="jeopardy">
                <thead>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>`);
	}
	// appends the HTML for the RESTART button to the navbar
	changeButton() {
		$("nav").append(`
        <div class="btn">
            <h1>RESTART
            </h1>
        </div>`);
	}
	// creates the initial page that has the Jeopardy logo and the start button
	loadHomePage() {
		$("body").prepend(`<div id="pseudo-body"></div>`);
		$("#pseudo-body").append(`
        <nav>
        </nav>`);
		$("nav").append(`
        <div class="btn">
            <h1>START
            </h1>
        </div>`);
		const btn = $(".btn").get()[0];
		btn.addEventListener("click", game.setupAndStart);
	}
	// restarts the game by emptying the categories array, removing the table & restart button, and fetching all new info & creating a new game
	async restartGame() {
		game.categories = [];
		$("#main-div").remove();
		$("#restart-div").remove();
		game.showLoadingView();
		game.hideLoadingView();
		await game.setupAndStart();
	}
}

const game = new Jeopardy();
game.loadHomePage();
