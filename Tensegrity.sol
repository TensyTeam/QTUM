pragma solidity ^0.4.21;

contract Tensegrity {
    event LessonStarted (
        address indexed teacher,
        uint indexed end_time
    );
    
    event DisputeMade (
        address indexed teacher
    );
    
    event DisputeResolved (
        address indexed teacher,
        address indexed student,
        uint price,
        bool teacher_is_right
    );
    
    event LessonPrepared (
        address indexed teacher
    );
    
    struct Course {
        address student;
        address author;
        bool blocked;
        uint price;
        uint duration;
        uint start;
    }
    
    struct Dispute {
        address student;
        address author;
        uint price;
    }
    
    modifier has_expiried(address teacher) {
        uint diff = now - courses[teacher].start;
        require(diff > courses[teacher].duration, "The course has not ended yet");
        require(courses[teacher].blocked, "Course is not blocked");
        _;
    }
    
    modifier is_not_blocked(address teacher) {
        require(!courses[teacher].blocked, "Teacher is blocked");
        _;
    }
    
    modifier is_moderator() {
        require(msg.sender == moderator, "Only moderators are allowed to inkoe this function");
        _;
    }
    
    modifier is_your_course(address teacher) {
        require(courses[teacher].student == msg.sender, "This course is not yours");
        _;
    }
    
    constructor() public {
        moderator = msg.sender;
    }
    
    address public moderator;
    mapping (address => Course) public courses;
    mapping (address => Dispute) public disputes;
    
    function teacher_ready_to_give_lesson(uint price, address student, address author, uint duration) public is_not_blocked(msg.sender) {
        require(price != 0, "price should not be equal to zero");
        require(duration <= 60 * 60 * 3, "Lesson is too big");
        
        courses[msg.sender] = Course({
            student: student,
            price: price,
            blocked: false,
            author: author,
            duration: duration,
            start: 0
        });
        
        emit LessonPrepared(msg.sender);
    }
    
    function student_start_lesson(address teacher) public is_your_course(teacher) is_not_blocked(teacher) payable {
        require(courses[teacher].price == msg.value, "Invalid amount");
        
        courses[teacher].blocked = true;
        courses[teacher].start = now;
    
        emit LessonStarted(teacher, now + courses[teacher].duration);
    }
    
    function student_end_lesson(bool is_ok, address teacher) public is_your_course(teacher) has_expiried(teacher) {
        if (is_ok) {
            require(teacher.send(courses[teacher].price));
        }
        else {
            disputes[teacher] = Dispute({
                student: msg.sender,
                author: courses[teacher].author,
                price: courses[teacher].price
            });
            
            emit DisputeMade(teacher);
        }
        
        courses[teacher].blocked = false;
        courses[teacher].student = address(0);
    }
    
    function resolve_dispute(address teacher) public is_moderator() {
        uint diff = now - courses[teacher].start;
        require(diff > 60 * 5, "Wait for student to give a grade");
        require(courses[teacher].blocked, "Course is not blocked");
        
        require(teacher.send(disputes[teacher].price), "Unable to send");
        emit DisputeResolved(teacher, courses[teacher].student, courses[teacher].price, true);
    }

    function resolve_dispute(address teacher, bool teacher_is_right) public is_moderator() {
        require(disputes[teacher].student != 0, "There is no dispute related to this teacher");
        
        if (teacher_is_right) {
            require(teacher.send(disputes[teacher].price), "Unable to send");
        }
        else {
            require(disputes[teacher].student.send(disputes[teacher].price), "Unable to send");   
        }
        
        disputes[teacher].student = address(0);
        emit DisputeResolved(teacher, courses[teacher].student, courses[teacher].price, teacher_is_right);
    }
}
